import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Factory } from '@jorgebodega/typeorm-factory';
import { Brand } from '../../../src/brands/entities/brand.entity';
import { BrandKey } from '../../../src/brands/brands.constants';

export class BrandFactory extends Factory<Brand> {
  protected entity = Brand;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<Brand> {
    return {
      name: faker.company.name(),
      theme: {
        primaryColor: faker.color.rgb(),
        secondaryColor: faker.color.rgb(),
      },
      key: faker.helpers.arrayElement<BrandKey>([
        BrandKey.LUSSO,
        BrandKey.BRILLIPOINT,
        BrandKey.ALETVIA,
      ]),
    };
  }
}
