import { BadRequestException, Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { createToken } from './auth';
import { DbService } from './db.service';

@Controller('auth')
export class AuthController {
  constructor(private db: DbService) {}

  @Post('register')
  async register(@Body() body: { username: string; password: string }) {
    if (!body.username || !body.password) {
      throw new BadRequestException('Completează utilizatorul și parola');
    }
    try {
      const result = await this.db.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
        [body.username, body.password],
      );
      const user = result.rows[0];
      return { token: createToken(user), username: user.username };
    } catch {
      throw new BadRequestException('Utilizatorul există deja');
    }
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const result = await this.db.query(
      `SELECT id, username FROM users WHERE username = '${body.username}' AND password = '${body.password}'`,
    );
    if (result.rows.length === 0) {
      throw new UnauthorizedException('Utilizator sau parolă greșită');
    }
    const user = result.rows[0];
    return { token: createToken(user), username: user.username };
  }
}
