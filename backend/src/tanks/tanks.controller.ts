import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Req, Query } from '@nestjs/common';
import { TanksService } from './tanks.service';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * @controller TanksController
 * @description Define los endpoints de la API para la gestión de tanques (piscinas).
 */
@Controller('tanks')
@UseGuards(JwtAuthGuard)
export class TanksController {
  constructor(private readonly tanksService: TanksService) {}

  @Post()
  create(@Body() createTankDto: CreateTankDto, @Req() req) {
    return this.tanksService.create(createTankDto, req.user);
  }

  @Get()
  findAllForUser(@Req() req, @Query('userId') targetUserId?: string) {
    return this.tanksService.findAllForUser(req.user, targetUserId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.tanksService.findOne(id, req.user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateTankDto: UpdateTankDto, @Req() req) {
    return this.tanksService.update(id, updateTankDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.tanksService.remove(id, req.user);
  }
}