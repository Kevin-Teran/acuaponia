import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { CustomError } from './errorHandler';

// Esquemas de validación
const schemas = {
  // Autenticación
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email debe tener un formato válido',
      'any.required': 'Email es requerido',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Contraseña debe tener al menos 6 caracteres',
      'any.required': 'Contraseña es requerida',
    }),
  }),

  // Usuario
  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).max(100).required(),
    role: Joi.string().valid('ADMIN', 'USER').default('USER'),
  }),

  updateUser: Joi.object({
    email: Joi.string().email(),
    name: Joi.string().min(2).max(100),
    role: Joi.string().valid('ADMIN', 'USER'),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED'),
  }),

  // Sensor
  createSensor: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    type: Joi.string().valid('TEMPERATURE', 'PH', 'OXYGEN', 'LEVEL', 'FLOW').required(),
    location: Joi.string().min(2).max(200).required(),
    tankId: Joi.string().required(),
    calibrationDate: Joi.date().required(),
  }),

  updateSensor: Joi.object({
    name: Joi.string().min(2).max(100),
    location: Joi.string().min(2).max(200),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR'),
    batteryLevel: Joi.number().min(0).max(100),
    calibrationDate: Joi.date(),
  }),

  // Tanque
  createTank: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    location: Joi.string().min(2).max(200).required(),
    capacity: Joi.number().positive().required(),
    currentLevel: Joi.number().min(0).required(),
  }),

  updateTank: Joi.object({
    name: Joi.string().min(2).max(100),
    location: Joi.string().min(2).max(200),
    capacity: Joi.number().positive(),
    currentLevel: Joi.number().min(0),
    status: Joi.string().valid('ACTIVE', 'MAINTENANCE', 'INACTIVE'),
  }),

  // Datos de sensor
  sensorData: Joi.object({
    temperature: Joi.number().min(-10).max(50).allow(null),
    ph: Joi.number().min(0).max(14).allow(null),
    oxygen: Joi.number().min(0).max(20).allow(null),
    timestamp: Joi.date().default(Date.now),
  }),

  // Alerta
  createAlert: Joi.object({
    type: Joi.string().valid(
      'TEMPERATURE_HIGH', 'TEMPERATURE_LOW',
      'PH_HIGH', 'PH_LOW',
      'OXYGEN_HIGH', 'OXYGEN_LOW',
      'SENSOR_OFFLINE', 'SYSTEM_ERROR'
    ).required(),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),
    message: Joi.string().min(10).max(500).required(),
    sensorId: Joi.string().required(),
    value: Joi.number(),
    threshold: Joi.number(),
  }),

  // Reporte
  createReport: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    type: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM').required(),
    parameters: Joi.object({
      startDate: Joi.date(),
      endDate: Joi.date(),
      sensorIds: Joi.array().items(Joi.string()),
      tankIds: Joi.array().items(Joi.string()),
      includeAlerts: Joi.boolean().default(false),
    }).required(),
  }),

  // Parámetros de consulta
  queryParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().max(100),
    startDate: Joi.date(),
    endDate: Joi.date(),
    status: Joi.string(),
    type: Joi.string(),
  }),
};

// Función helper para crear middleware de validación
const createValidationMiddleware = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      throw new CustomError(`Validación fallida: ${errorMessage}`, 400);
    }

    req[property] = value;
    next();
  };
};

// Middleware de validación exportados
export const authValidation = {
  login: createValidationMiddleware(schemas.login),
};

export const userValidation = {
  create: createValidationMiddleware(schemas.createUser),
  update: createValidationMiddleware(schemas.updateUser),
  query: createValidationMiddleware(schemas.queryParams, 'query'),
};

export const sensorValidation = {
  create: createValidationMiddleware(schemas.createSensor),
  update: createValidationMiddleware(schemas.updateSensor),
  data: createValidationMiddleware(schemas.sensorData),
  query: createValidationMiddleware(schemas.queryParams, 'query'),
};

export const tankValidation = {
  create: createValidationMiddleware(schemas.createTank),
  update: createValidationMiddleware(schemas.updateTank),
  query: createValidationMiddleware(schemas.queryParams, 'query'),
};

export const alertValidation = {
  create: createValidationMiddleware(schemas.createAlert),
  query: createValidationMiddleware(schemas.queryParams, 'query'),
};

export const reportValidation = {
  create: createValidationMiddleware(schemas.createReport),
  query: createValidationMiddleware(schemas.queryParams, 'query'),
};

export default {
  authValidation,
  userValidation,
  sensorValidation,
  tankValidation,
  alertValidation,
  reportValidation,
};