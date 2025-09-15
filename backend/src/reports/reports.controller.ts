/**
 * @file reports.controller.ts
 * @route backend/src/reports
 * @description 
 * @author Kevin Mariano 
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import {
  Controller, Post, Body, Get, UseGuards, Req, Query, Res, Param,
  NotFoundException, InternalServerErrorException, Logger
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '@prisma/client';
import * as fs from 'fs';

/**
 * @controller ReportsController
 * @description Gestiona los endpoints para la creación y descarga de reportes.
 */
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  /**
   * @route   POST /api/reports
   * @desc    Crea la solicitud para un nuevo reporte.
   */
  @Post()
  @Roles('ADMIN', 'USER')
  create(@Body() createReportDto: CreateReportDto, @Req() req: { user: User }) {
    return this.reportsService.create(createReportDto, req.user);
  }

  /**
   * @route   GET /api/reports
   * @desc    Obtiene el historial de reportes.
   */
  @Get()
  @Roles('ADMIN', 'USER')
  findAll(@Req() req: { user: User }, @Query('userId') userId?: string) {
    return this.reportsService.findAll(req.user, userId);
  }

  /**
   * @route   GET /api/reports/download/:id/:format
   * @desc    Descarga un archivo de reporte generado en el formato especificado.
   * @returns {void} Envía el archivo como respuesta para su descarga en el navegador.
   */
  @Get('download/:id/:format')
  @Roles('ADMIN', 'USER')
  async download(
    @Param('id') id: string,
    @Param('format') format: 'pdf' | 'xlsx',
    @Req() req: { user: User },
    @Res() res: Response
  ) {
    try {
      const report = await this.reportsService.findOne(id, req.user);
      
      const { filePath, title } = await this.reportsService.generateFileFromData(report, format);
      
      if (!fs.existsSync(filePath)) {
          this.logger.error(`El archivo generado no se encontró en la ruta: ${filePath}`);
          throw new InternalServerErrorException('No se pudo encontrar el archivo del reporte generado.');
      }
      
      res.download(filePath, `${title}.${format}`, (err) => {
        if (err) {
          this.logger.error(`Error al enviar el archivo de reporte ${id} al cliente:`, err);
          if (!res.headersSent) {
            res.status(500).send({ message: "No se pudo descargar el archivo." });
          }
        }
      });
    } catch (error) {
      this.logger.error(`Fallo completo en el proceso de descarga del reporte ${id}:`, error);
      if (!res.headersSent) {
          const status = error instanceof NotFoundException ? 404 : 500;
          res.status(status).send({ message: error.message || 'Error interno del servidor.' });
      }
    }
  }
}