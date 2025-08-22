/**
 * @file data.controller.ts
 * @description Endpoints para la gestión de datos, incluyendo históricos, inyección manual y simulación.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 */

 import { Controller, Post, Body, Get, UseGuards, Query, Req } from '@nestjs/common';
 import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
 import { RolesGuard } from '../auth/guards/roles.guard';
 import { Roles } from '../auth/decorators/roles.decorator';
 import { DataService } from './data.service';
 import { ManualEntryDto } from './dto/manual-entry.dto';
 import { EmitterControlDto } from './dto/emitter.dto';
 import { User } from '@prisma/client';
 import { GetLatestDataDto } from './dto/get-latest-data.dto'; // Asegúrate de que este DTO exista
 
 @Controller('data')
 @UseGuards(JwtAuthGuard)
 export class DataController {
   constructor(private readonly dataService: DataService) {}
 
   // --- ENDPOINT AÑADIDO PARA SOLUCIONAR EL ERROR 404 ---
   @Get('latest')
   getLatestData(@Query() query: GetLatestDataDto, @Req() req: { user: User }) {
     return this.dataService.getLatest(query, req.user);
   }
 
   @Get('historical')
   getHistoricalData(
     @Req() req: { user: User },
     @Query('tankId') tankId: string,
     @Query('startDate') startDate: string,
     @Query('endDate') endDate: string,
   ) {
     return this.dataService.getHistoricalData(req.user, tankId, startDate, endDate);
   }
 
   @Post('manual')
   @UseGuards(RolesGuard)
   @Roles('ADMIN')
   submitManualData(@Body() manualEntryDto: ManualEntryDto) {
     return this.dataService.submitManualEntry(manualEntryDto.entries);
   }
 
   @Post('emitter/start')
   @UseGuards(RolesGuard)
   @Roles('ADMIN')
   startEmitters(@Body() emitterControlDto: EmitterControlDto) {
     return this.dataService.startEmitters(emitterControlDto.sensorIds);
   }
 
   @Post('emitter/stop')
   @UseGuards(RolesGuard)
   @Roles('ADMIN')
   stopEmitter(@Body() body: { sensorId: string }) {
     return this.dataService.stopEmitter(body.sensorId);
   }
 
   @Get('emitter/status')
   @UseGuards(RolesGuard)
   @Roles('ADMIN')
   getEmitterStatus() {
     return this.dataService.getEmitterStatus();
   }
 }