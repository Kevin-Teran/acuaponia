import {
    Controller, Post, Body, Get, UseGuards, Req, Query, Res, Param,
    NotFoundException, InternalServerErrorException
  } 
from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
  
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}
  
@Post()
@Roles('ADMIN', 'USER')
create(@Body() createReportDto: CreateReportDto, @Req() req: { user: User }) {
  return this.reportsService.create(createReportDto, req.user);
}
  
@Get()
@Roles('ADMIN', 'USER')
findAll(@Req() req: { user: User }, @Query('userId') userId?: string) {
  return this.reportsService.findAll(req.user, userId);
}
  
/**
 * @route   GET /api/reports/download/:id/:format
 * @desc   Descarga un archivo de reporte generado en el formato especificado.
 * @param   {string} id - ID del reporte.
 * @param   {string} format - Formato de archivo deseado ('pdf' o 'xlsx').
 * @param   {Response} res - Objeto de respuesta de Express.
 * @returns {void} Envía el archivo como respuesta.
 */
@Get('download/:id/:format')
@Roles('ADMIN', 'USER')
async download(
  @Param('id') id: string,
  @Param('format') format: string,
  @Req() req: { user: User },
  @Res() res: Response
) {
    const report = await this.reportsService.findOne(id, req.user);
    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }
  
    const { filePath, title } = await this.reportsService.generateFileFromData(report, format);
  
    if (!filePath || !fs.existsSync(filePath)) { // <<-- CORREGIDO: Uso de fs
        throw new NotFoundException('El archivo del reporte no pudo ser generado.');
    }
  
    try {
      res.download(filePath, `${title}.${format}`);
    } catch (error) {
      throw new InternalServerErrorException('No se pudo descargar el archivo.');
    }
  }
}