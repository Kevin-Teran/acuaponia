import mongoose, { Document, Schema } from 'mongoose';

export interface ISensor extends Document {
  name: string;
  type: 'temperature' | 'ph' | 'oxygen';
  location: string;
  tankId: mongoose.Types.ObjectId;
  status: 'active' | 'inactive' | 'maintenance';
  batteryLevel: number;
  calibrationDate: Date;
  lastReading?: number;
  lastUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sensorSchema = new Schema<ISensor>({
  name: {
    type: String,
    required: [true, 'El nombre del sensor es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  type: {
    type: String,
    enum: ['temperature', 'ph', 'oxygen'],
    required: [true, 'El tipo de sensor es requerido']
  },
  location: {
    type: String,
    required: [true, 'La ubicación es requerida'],
    trim: true,
    maxlength: [200, 'La ubicación no puede exceder 200 caracteres']
  },
  tankId: {
    type: Schema.Types.ObjectId,
    ref: 'Tank',
    required: [true, 'El tanque asociado es requerido']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  batteryLevel: {
    type: Number,
    min: [0, 'El nivel de batería no puede ser negativo'],
    max: [100, 'El nivel de batería no puede exceder 100'],
    default: 100
  },
  calibrationDate: {
    type: Date,
    required: [true, 'La fecha de calibración es requerida']
  },
  lastReading: {
    type: Number
  },
  lastUpdate: {
    type: Date
  }
}, {
  timestamps: true
});

// Índices
sensorSchema.index({ type: 1 });
sensorSchema.index({ tankId: 1 });
sensorSchema.index({ status: 1 });

// Virtual para determinar si necesita calibración
sensorSchema.virtual('needsCalibration').get(function() {
  const monthsAgo = new Date();
  monthsAgo.setMonth(monthsAgo.getMonth() - 3); // 3 meses
  return this.calibrationDate < monthsAgo;
});

// Incluir virtuals en JSON
sensorSchema.set('toJSON', { virtuals: true });

export default mongoose.model<ISensor>('Sensor', sensorSchema);