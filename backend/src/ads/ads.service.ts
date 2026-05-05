import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ad } from './ad.entity';

@Injectable()
export class AdsService {
  constructor(@InjectRepository(Ad) private adRepo: Repository<Ad>) {}

  async getRandom(): Promise<Ad | null> {
    const ads = await this.adRepo.find({ where: { isActive: true } });
    if (!ads.length) return null;
    return ads[Math.floor(Math.random() * ads.length)];
  }

  async getAll(): Promise<Ad[]> {
    return this.adRepo.find({ where: { isActive: true } });
  }

  async create(dto: Partial<Ad>): Promise<Ad> {
    return this.adRepo.save(this.adRepo.create(dto));
  }
}
