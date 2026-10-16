import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from './auth';
import { DbService } from './db.service';

@Controller('notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(private db: DbService) {}

  // Notițele mele, cu căutare după titlu
  @Get()
  async list(@Req() req, @Query('search') search = '') {
    try {
      const result = await this.db.query(
        `SELECT id, title, content, is_public, created_at FROM notes
         WHERE user_id = ${req.user.sub} AND title ILIKE '%${search}%'
         ORDER BY id DESC`,
      );
      return result.rows;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  // Notițele publice ale tuturor utilizatorilor
  @Get('public')
  async listPublic() {
    const result = await this.db.query(
      `SELECT n.id, n.title, n.content, n.created_at, u.username
       FROM notes n JOIN users u ON u.id = n.user_id
       WHERE n.is_public ORDER BY n.id DESC`,
    );
    return result.rows;
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const result = await this.db.query(
      'SELECT id, title, content, is_public, created_at FROM notes WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Notița nu există');
    }
    return result.rows[0];
  }

  @Post()
  async create(@Req() req, @Body() body: { title: string; content: string; isPublic?: boolean }) {
    if (!body.title || !body.content) {
      throw new BadRequestException('Completează titlul și conținutul');
    }
    const result = await this.db.query(
      `INSERT INTO notes (user_id, title, content, is_public) VALUES ($1, $2, $3, $4)
       RETURNING id, title, content, is_public, created_at`,
      [req.user.sub, body.title, body.content, !!body.isPublic],
    );
    return result.rows[0];
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.db.query('DELETE FROM notes WHERE id = $1', [id]);
    return { deleted: true };
  }
}
