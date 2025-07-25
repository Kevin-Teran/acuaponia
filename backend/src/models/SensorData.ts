import mongoose, { Document, Schema } from 'mongoose';

export interface ISensorData extends Document {
  sensorId: mongoose.Types.ObjectId;
  tankId: mongoose.Types.ObjectId;
  sensorType: 'temperature' | 'ph' | 'oxygen';
  value: number;
  unit: string;
  timestamp: Date;
  quality: 'good' | 'warning' | 'critical';
  metadata?: {
    batteryLevel?: number;
    signalStrength?: number;
    calibrationStatus?: string;
  };
}

const sensorDataSchema = new Schema<ISensorData>({
  sensorId: {
    type: Schema.Types.ObjectId,
    ref: 'Sensor',
    required: [true, 'El ID del sensor es requerido']
  },
  tankId: {
    type: Schema.Types.ObjectId,
    ref: 'Tank',
    required: [true, 'El ID del tanque es requerido']
  },
  sensorType: {
    type: String,
    enum: ['temperature', 'ph', 'oxygen'],
    required: [true, 'El tipo de sensor es requerido']
  },
  value: {
    type: Number,
    required: [true, 'El valor es requerido']
  },
  unit: {
    type: String,
    required: [true, 'La unidad es requerida']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  quality: {
    type: String,
    enum: ['good', 'warning', 'critical'],
    default: 'good'
  },
  metadata: {
    batteryLevel: Number,
    signalStrength: Number,
    calibrationStatus: String
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
sensorDataSchema.index({ sensorId: 1, timestamp: -1 });
sensorDataSchema.index({ tankId: 1, timestamp: -1 });
sensorDataSchema.index({ sensorType: 1, timestamp: -1 });
sensorDataSchema.index({ timestamp: -1 });
sensorDataSchema.index({ quality: 1 });

// TTL index para eliminar datos antiguos automáticamente (opcional)
sensorDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // 1 año

export default mongoose.model<ISensorData>('SensorData', sensorDataSchema);