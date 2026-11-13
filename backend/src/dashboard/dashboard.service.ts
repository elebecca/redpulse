import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  // PrismaService gives this service access to PostgreSQL.
  constructor(private readonly prisma: PrismaService) {}

  // Calculate the date range immediately before the selected period.
  //
  // Example:
  // current period: 1 Oct -> 31 Oct
  // previous period: 1 Sep -> 30 Sep
  getPreviousPeriod(startDate: Date, endDate: Date) {
    const periodLength = endDate.getTime() - startDate.getTime();

    const previousEndDate = new Date(startDate);
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    return {
      previousStartDate,
      previousEndDate,
    };
  }

  // Count non-test players who placed at least one
  // settled real-money bet during the selected period.
  async getActivePlayers(startDate: Date, endDate: Date) {
    return this.prisma.players.count({
      where: {
        is_test: false,
        bets: {
          some: {
            status: 'settled',
            is_real_money: true,
            placed_at: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
      },
    });
  }

  // Count non-test players whose registration happened
  // during the selected period.
  async getRegistrations(startDate: Date, endDate: Date) {
    return this.prisma.players.count({
      where: {
        is_test: false,
        registration_at: {
          gte: startDate,
          lt: endDate,
        },
      },
    });
  }

  // Count non-test players whose first deposit happened
  // during the selected period.
  async getFirstTimeDepositors(startDate: Date, endDate: Date) {
    return this.prisma.players.count({
      where: {
        is_test: false,
        first_deposit_at: {
          gte: startDate,
          lt: endDate,
        },
      },
    });
  }

  async getSummary() {
    // Define the current dashboard period.
    //
    // NOTE:
    // This is currently 60 days because the MVP uses static synthetic data.
    // Later this should come from the selected dashboard date range.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const periodStart = new Date(startOfDay);
    periodStart.setDate(periodStart.getDate() - 60);

    // Work out the period immediately before the current one.
    const { previousStartDate, previousEndDate } = this.getPreviousPeriod(
      periodStart,
      startOfDay,
    );

    // ------------------------------------------------------------
    // REVENUE
    // ------------------------------------------------------------

    // Sum settled real-money stakes.
    const revenueStakeAmount = await this.prisma.bets.aggregate({
      where: {
        status: 'settled',
        is_real_money: true,
        settled_at: {
          gte: periodStart,
        },
      },
      _sum: {
        stake_amount: true,
      },
    });

    // Sum settled real-money payouts.
    const payoutAmount = await this.prisma.bets.aggregate({
      where: {
        status: 'settled',
        is_real_money: true,
        settled_at: {
          gte: periodStart,
        },
      },
      _sum: {
        payout_amount: true,
      },
    });

    // Prisma Decimal values are converted to normal JavaScript numbers.
    const revenueStakeAmountValue = Number(
      revenueStakeAmount._sum.stake_amount ?? 0,
    );

    const payoutAmountValue = Number(payoutAmount._sum.payout_amount ?? 0);

    // Gross Gaming Revenue.
    const ggr = Number(
      (revenueStakeAmountValue - payoutAmountValue).toFixed(2),
    );

    // ------------------------------------------------------------
    // PLAYERS - CURRENT PERIOD
    // ------------------------------------------------------------

    // Active players in the current selected period.
    const activePlayers = await this.getActivePlayers(periodStart, startOfDay);

    // Registrations in the current selected period.
    const registrations = await this.getRegistrations(periodStart, startOfDay);

    // First-time depositors in the current selected period.
    const firstTimeDepositors = await this.getFirstTimeDepositors(
      periodStart,
      startOfDay,
    );

    // ------------------------------------------------------------
    // PLAYERS - PREVIOUS PERIOD
    // ------------------------------------------------------------

    // Use the same business definitions,
    // but apply them to the previous period.
    const previousActivePlayers = await this.getActivePlayers(
      previousStartDate,
      previousEndDate,
    );

    const previousRegistrations = await this.getRegistrations(
      previousStartDate,
      previousEndDate,
    );

    const previousFirstTimeDepositors = await this.getFirstTimeDepositors(
      previousStartDate,
      previousEndDate,
    );

    // ------------------------------------------------------------
    // DEPOSITS
    // ------------------------------------------------------------

    const deposits = await this.prisma.deposits.aggregate({
      where: {
        processed_at: {
          gte: periodStart,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const depositsValue = Number(deposits._sum.amount ?? 0);

    // ------------------------------------------------------------
    // CONVERSION RATE
    // ------------------------------------------------------------

    // Registered players = all non-test players.
    const registeredPlayers = await this.prisma.players.count({
      where: {
        is_test: false,
      },
    });

    // Converted players = non-test players who made a first deposit.
    const convertedPlayers = await this.prisma.players.count({
      where: {
        is_test: false,
        first_deposit_at: {
          not: null,
        },
      },
    });

    // Avoid division by zero.
    const conversionRate =
      registeredPlayers === 0
        ? 0
        : Number(((convertedPlayers / registeredPlayers) * 100).toFixed(1));

    // ------------------------------------------------------------
    // BONUS
    // ------------------------------------------------------------

    const bonusCost = await this.prisma.bonuses.aggregate({
      where: {
        issued_at: {
          gte: periodStart,
        },
      },
      _sum: {
        bonus_cost_amount: true,
      },
    });

    const bonusCostValue = Number(bonusCost._sum.bonus_cost_amount ?? 0);

    // ------------------------------------------------------------
    // TECHNICAL
    // ------------------------------------------------------------

    const systemUptime = await this.prisma.technical_metrics.aggregate({
      _avg: {
        value: true,
      },
      where: {
        metric_type: 'availability',
        measured_at: {
          gte: periodStart,
        },
      },
    });

    const systemUptimeValue = Number((systemUptime._avg.value ?? 0).toFixed(1));

    // ------------------------------------------------------------
    // GEOGRAPHY
    // ------------------------------------------------------------

    const regions = await this.prisma.markets.findMany({
      distinct: ['region'],
      select: {
        region: true,
      },
    });

    const regionsValue = regions.length;

    // ------------------------------------------------------------
    // GAMES
    // ------------------------------------------------------------

    const gamesActivity = await this.prisma.bets.count({
      where: {
        status: 'settled',
        is_real_money: true,
        placed_at: {
          gte: periodStart,
        },
      },
    });

    // ------------------------------------------------------------
    // RETENTION
    // ------------------------------------------------------------

    const eligiblePlayers = await this.prisma.players.count({
      where: {
        is_test: false,
        registration_at: {
          lte: periodStart,
        },
      },
    });

    const retainedPlayers = await this.prisma.players.count({
      where: {
        registration_at: {
          lte: periodStart,
        },
        is_test: false,
        bets: {
          some: {
            status: 'settled',
            is_real_money: true,
            placed_at: {
              gte: periodStart,
            },
          },
        },
      },
    });

    const retention =
      eligiblePlayers === 0
        ? 0
        : Number(((retainedPlayers / eligiblePlayers) * 100).toFixed(1));

    console.log({
      activePlayers,
      previousActivePlayers,
      registrations,
      previousRegistrations,
      firstTimeDepositors,
      previousFirstTimeDepositors,
    });
    // ------------------------------------------------------------
    // API RESPONSE
    // ------------------------------------------------------------

    return {
      revenue: {
        value: ggr,
      },

      // Current and previous-period Players KPIs.
      players: {
        value: activePlayers,
        previousValue: previousActivePlayers,
      },

      registrations: {
        value: registrations,
        previousValue: previousRegistrations,
      },

      firstTimeDepositors: {
        value: firstTimeDepositors,
        previousValue: previousFirstTimeDepositors,
      },

      deposits: {
        value: depositsValue,
      },

      conversionRate: {
        value: conversionRate,
      },

      bonus: {
        value: bonusCostValue,
      },

      technical: {
        value: systemUptimeValue,
      },

      geography: {
        value: regionsValue,
      },

      games: {
        value: gamesActivity,
      },

      retention: {
        value: retention,
      },
    };
  }
}
