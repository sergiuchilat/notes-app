import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DbService {
  private pool = new Pool({
    host: 'db',
    user: 'postgres',
    password: 'postgres',
    database: 'notes',
  });

  query(sql: string, params: unknown[] = []) {
    return this.pool.query(sql, params);
  }
}
