import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { DbService } from './db.service';
import { HealthController } from './health.controller';
import { NotesController } from './notes.controller';

@Module({
  controllers: [HealthController, AuthController, NotesController],
  providers: [DbService],
})
export class AppModule {}
