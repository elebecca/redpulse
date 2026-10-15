import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  async getSummary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(startOfDay);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueStakeAmount = await this.prisma.bets.aggregate({
      where: {
        status: 'settled',
        is_real_money: true,
      },
      _sum: {
        stake_amount: true,
      },
    });
    const payoutAmount = await this.prisma.bets.aggregate({
      where: {
        status: 'settled',
        is_real_money: true,
      },
      _sum: {
        payout_amount: true,
      },
    });
    const revenueStakeAmountValue = Number(
      revenueStakeAmount._sum.stake_amount,
    );
    const payoutAmountValue = Number(payoutAmount._sum.payout_amount);
    const ggr = Number(
      (revenueStakeAmountValue - payoutAmountValue).toFixed(2),
    );

    const activePlayers = await this.prisma.players.count({
      where: {
        status: 'active',
        is_test: false,
      },
    });

    const deposits = await this.prisma.deposits.aggregate({
      _sum: {
        amount: true,
      },
    });
    const depositsValue = Number(deposits._sum.amount ?? 0);

    const registeredPlayers = await this.prisma.players.count({
      where: {
        is_test: false,
      },
    });

    const convertedPlayers = await this.prisma.players.count({
      where: {
        is_test: false,
        first_deposit_at: {
          not: null,
        },
      },
    });

    const conversionRate =
      registeredPlayers === 0
        ? 0
        : Number(((convertedPlayers / registeredPlayers) * 100).toFixed(1));

    const bonusCost = await this.prisma.bonuses.aggregate({
      _sum: {
        bonus_cost_amount: true,
      },
    });
    const bonusCostValue = Number(bonusCost._sum.bonus_cost_amount ?? 0);

    const systemUptime = await this.prisma.technical_metrics.aggregate({
      _avg: {
        value: true,
      },
      where: {
        metric_type: 'availability',
      },
    });
    const systemUptimeVlue = Number((systemUptime._avg.value ?? 0).toFixed(1));

    const regions = await this.prisma.markets.findMany({
      distinct: ['region'],
      select: {
        region: true,
      },
    });
    const regionsValue = regions.length;
    const gamesActivity = await this.prisma.bets.count({
      where: {
        status: 'settled',
        is_real_money: true,
      },
    });

    const eligiblePlayers = await this.prisma.players.count({
      where: {
        is_test: false,
        registration_at: {
          lte: thirtyDaysAgo,
        },
      },
    });

    const retainedPlayers = await this.prisma.players.count({
      where: {
        registration_at: {
          lte: thirtyDaysAgo,
        },
        is_test: false,

        bets: {
          some: {
            status: 'settled',
            is_real_money: true,
            placed_at: {
              gte: thirtyDaysAgo,
            },
          },
        },
      },
    });

    const retention =
      eligiblePlayers === 0
        ? 0
        : Number(((retainedPlayers / eligiblePlayers) * 100).toFixed(1));

    return {
      revenue: {
        value: ggr,
      },
      players: {
        value: activePlayers,
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
        value: systemUptimeVlue,
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
