import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sensors')
@UseGuards(JwtAuthGuard)
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  create(@Body() createSensorDto: CreateSensorDto, @Req() req) {
    return this.sensorsService.create(createSensorDto, req.user);
  }

  @Get()
  findAllForUser(@Req() req, @Query('userId') targetUserId?: string) {
    return this.sensorsService.findAllForUser(req.user, targetUserId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.sensorsService.findOne(id, req.user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateSensorDto: UpdateSensorDto, @Req() req) {
    return this.sensorsService.update(id, updateSensorDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.sensorsService.remove(id, req.user);
  }
}