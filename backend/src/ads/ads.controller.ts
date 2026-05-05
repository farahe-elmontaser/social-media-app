import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Ad } from './ad.entity';

@Controller('ads')
@UseGuards(JwtAuthGuard)
export class AdsController {
  constructor(private adsService: AdsService) {}

  @Get('random')
  getRandom(): Promise<Ad | null> {
    return this.adsService.getRandom();
  }

  @Get()
  getAll(): Promise<Ad[]> {
    return this.adsService.getAll();
  }

  @Post()
  create(@Body() dto: Partial<Ad>): Promise<Ad> {
    return this.adsService.create(dto);
  }
}
