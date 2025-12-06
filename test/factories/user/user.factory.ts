import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Factory } from '@jorgebodega/typeorm-factory';
import { User } from '../../../src/user/entities/user.entity';
import { USER_ROLES } from '../../../src/common/types/user-roles.type';

export class UserFactory extends Factory<User> {
  protected entity = User;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<User> {
    return {
      role: faker.helpers.arrayElement<USER_ROLES>(Object.values(USER_ROLES)),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
      phone: faker.phone.number(),
    };
  }

  /**
   * Creates a user with a known password for testing authentication
   */
  async makeWithPassword(password: string): Promise<User> {
    const user = await this.make();
    await user.hashPassword(password);
    return user;
  }

  /**
   * Creates and persists a user with a known password
   */
  async createWithPassword(password: string): Promise<User> {
    const user = await this.makeWithPassword(password);
    return this.dataSource.getRepository(User).save(user);
  }
}
