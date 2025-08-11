import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { DataModule } from '../data/data.module';
import { ConfigModule } from '@nestjs/config'; 

@Module({
  imports: [
    DataModule, 
    ConfigModule 
  ], 
  providers: [MqttService],
})
export class MqttModule {}