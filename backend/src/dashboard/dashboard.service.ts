import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  getSummary() {
    return {
      activePlayers: {
        value: 123,
        comparison: 5,
      },
    };
  }
}
