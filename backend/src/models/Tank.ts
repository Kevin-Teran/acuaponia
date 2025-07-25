import mongoose, { Document, Schema } from 'mongoose';

export interface ITank extends Document {
  name: string;
  location: string;
  capacity: number;
  currentLevel: number;
  status: 'active' | 'maintenance' | 'inactive';
  assignedUsers: mongoose.Types.ObjectId[];
  sensors: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const tankSchema = new Schema<ITank>({
  name: {
    type: String,
    required: [true, 'El nombre del tanque es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  location: {
    type: String,
    required: [true, 'La ubicación es requerida'],
    trim: true,
    maxlength: [200, 'La ubicación no puede exceder 200 caracteres']
  },
  capacity: {
    type: Number,
    required: [true, 'La capacidad es requerida'],
    min: [1, 'La capacidad debe ser mayor a 0']
  },
  currentLevel: {
    type: Number,
    required: [true, 'El nivel actual es requerido'],
    min: [0, 'El nivel no puede ser negativo'],
    validate: {
      validator: function(this: ITank, value: number) {
        return value <= this.capacity;
      },
      message: 'El nivel actual no puede exceder la capacidad'
    }
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  },
  assignedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  sensors: [{
    type: Schema.Types.ObjectId,
    ref: 'Sensor'
  }]
}, {
  timestamps: true
});

// Índices
tankSchema.index({ status: 1 });
tankSchema.index({ assignedUsers: 1 });

// Virtual para porcentaje de llenado
tankSchema.virtual('fillPercentage').get(function() {
  return (this.currentLevel / this.capacity) * 100;
});

// Incluir virtuals en JSON
tankSchema.set('toJSON', { virtuals: true });

export default mongoose.model<ITank>('Tank', tankSchema);