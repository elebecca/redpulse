import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  getPreviousPeriod(startDate: Date, endDate: Date) {
    const periodLength = endDate.getTime() - startDate.getTime();

    return {
      previousStartDate: new Date(startDate.getTime() - periodLength),
      previousEndDate: new Date(startDate),
    };
  }

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
  async getDailyActivePlayers(startDate: Date, endDate: Date) {
    const dailyValues = [];

    let day = new Date(startDate);

    while (day < endDate) {
      const tomorrow = new Date(day);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const activePlayers = await this.getActivePlayers(day, tomorrow);

      dailyValues.push({
        date: day.toISOString().slice(0, 10),
        value: activePlayers,
      });

      day = tomorrow;
    }

    return dailyValues;
  }
  async getDailyRegistrations(startDate: Date, endDate: Date) {
    const result = [];
    let day = new Date(startDate);

    while (day < endDate) {
      const tomorrow = new Date(day);
      tomorrow.setDate(day.getDate() + 1);

      result.push({
        date: day.toISOString().slice(0, 10),
        value: await this.getRegistrations(day, tomorrow),
      });

      day = tomorrow;
    }

    return result;
  }
  async getDailyFirstTimeDepositors(startDate: Date, endDate: Date) {
    const result = [];
    let day = new Date(startDate);

    while (day < endDate) {
      const tomorrow = new Date(day);
      tomorrow.setDate(day.getDate() + 1);

      result.push({
        date: day.toISOString().slice(0, 10),
        value: await this.getFirstTimeDepositors(day, tomorrow),
      });

      day = tomorrow;
    }

    return result;
  }
  async getSummary() {
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 60);

    const { previousStartDate, previousEndDate } = this.getPreviousPeriod(
      startDate,
      endDate,
    );

    const activePlayers = await this.getActivePlayers(startDate, endDate);
    const registrations = await this.getRegistrations(startDate, endDate);
    const firstTimeDepositors = await this.getFirstTimeDepositors(
      startDate,
      endDate,
    );

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

    return {
      activePlayers: {
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
    };
  }
}
