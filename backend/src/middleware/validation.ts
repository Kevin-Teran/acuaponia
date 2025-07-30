import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { CustomError } from './errorHandler';
import { logger } from '../utils/logger';

const schemas = {
  login: Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'El email debe tener un formato válido.',
        'any.required': 'El email es un campo requerido.',
    }),
    password: Joi.string().required().messages({
        'any.required': 'La contraseña es un campo requerido.',
    }),
  }),
  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).max(100).required(),
    role: Joi.string().valid('ADMIN', 'USER').default('USER'),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED').default('ACTIVE'),
  }),
  updateUser: Joi.object({
    email: Joi.string().email(),
    name: Joi.string().min(2).max(100),
    role: Joi.string().valid('ADMIN', 'USER'),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED'),
    password: Joi.string().min(6).optional().allow(''),
  }),

  createSensor: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    hardwareId: Joi.string().required(), 
    type: Joi.string().valid('TEMPERATURE', 'PH', 'OXYGEN', 'LEVEL', 'FLOW').required(),
    tankId: Joi.string().required(),
    calibrationDate: Joi.date().required(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR'),
  }),
  updateSensor: Joi.object({
    name: Joi.string().min(2).max(100),
    hardwareId: Joi.string(), 
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR'),
    calibrationDate: Joi.date(),
    tankId: Joi.string(),
    type: Joi.string().valid('TEMPERATURE', 'PH', 'OXYGEN', 'LEVEL', 'FLOW'),
  }),

  createTank: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    location: Joi.string().min(2).max(200).required(),
    userId: Joi.string().required(),
    status: Joi.string().valid('ACTIVE', 'MAINTENANCE', 'INACTIVE'),
  }),
  updateTank: Joi.object({
    name: Joi.string().min(2).max(100),
    location: Joi.string().min(2).max(200),
    status: Joi.string().valid('ACTIVE', 'MAINTENANCE', 'INACTIVE'),
  }),

  sensorData: Joi.object({
    sensorId: Joi.string().required(),
    value: Joi.number().required(), // <-- CAMBIO: 'value' en lugar de métricas separadas
    type: Joi.string().valid('TEMPERATURE', 'PH', 'OXYGEN', 'LEVEL', 'FLOW').required(), // <-- CAMBIO: 'type' para identificar el dato
    timestamp: Joi.date().default(() => new Date()),
  }),
};

/**
 * @desc Función de fábrica que crea un middleware de validación para un esquema Joi.
 * @param {Joi.ObjectSchema} schema - El esquema de Joi a validar.
 * @param {'body' | 'query' | 'params'} property - La propiedad del objeto `req` a validar.
 * @returns Un middleware de Express.
 */
const createValidationMiddleware = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      logger.warn(`Validación fallida: ${errorMessage}`);
      throw new CustomError(`Error de validación: ${errorMessage}`, 400);
    }

    req[property] = value;
    next();
  };
};

export const authValidation = {
    login: createValidationMiddleware(schemas.login),
    refreshToken: createValidationMiddleware(schemas.refreshToken),
};

export const userValidation = {
  create: createValidationMiddleware(schemas.createUser),
  update: createValidationMiddleware(schemas.updateUser),
};

export const sensorValidation = {
    create: createValidationMiddleware(schemas.createSensor),
    update: createValidationMiddleware(schemas.updateSensor),
};

export const tankValidation = {
    create: createValidationMiddleware(schemas.createTank),
    update: createValidationMiddleware(schemas.updateTank),
};
