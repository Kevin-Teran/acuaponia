import { Controller, Get, Post, Body, Param, Delete, Put, Query, Req } from '@nestjs/common';
import { TanksService } from './tanks.service';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { Request } from 'express';
import { User } from '@prisma/client';

@Controller('tanks')
export class TanksController {
  constructor(private readonly tanksService: TanksService) {}

  @Post()
  create(@Body() createTankDto: CreateTankDto, @Req() req: Request) {
    const user = req.user as User;
    return this.tanksService.create(createTankDto, user); 
  }

  @Get()
  findAll(@Query('userId') userId: string, @Req() req: Request) {
    const currentUser = req.user as User;
    return this.tanksService.findAllForUser(currentUser, userId); 
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User;
    return this.tanksService.findOne(id, user); 
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateTankDto: UpdateTankDto, @Req() req: Request) {
    const user = req.user as User;
    return this.tanksService.update(id, updateTankDto, user); 
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User;
    return this.tanksService.remove(id, user); 
  }
}