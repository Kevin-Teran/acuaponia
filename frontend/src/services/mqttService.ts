/**
 * @file mqttService.ts
 * @description Servicio Singleton para gestionar la conexión y publicación de mensajes a un broker MQTT.
 */
 import mqtt from 'mqtt';
 import { MqttClient } from 'mqtt';
 
 class MqttService {
   private client: MqttClient | null = null;
   private readonly brokerUrl = 'ws://broker.hivemq.com:8000/mqtt';
 
   public connect(): Promise<void> {
     return new Promise((resolve, reject) => {
       if (this.client?.connected) {
         return resolve();
       }
       
       console.log(`🔌 Conectando al Broker MQTT público en: ${this.brokerUrl}`);
       
       this.client = mqtt.connect(this.brokerUrl);
 
       this.client.on('connect', () => {
         console.log('✅ Conectado exitosamente al Broker MQTT.');
         resolve();
       });
 
       this.client.on('error', (err) => {
         console.error('❌ Error de conexión MQTT:', err);
         this.client?.end();
         reject(err);
       });
     });
   }
 
   public publish(topic: string, message: string): Promise<void> {
     return new Promise((resolve, reject) => {
       if (!this.client?.connected) {
         return reject(new Error('Cliente MQTT no conectado.'));
       }
       this.client.publish(topic, message, (err) => {
         if (err) return reject(err);
         resolve();
       });
     });
   }
 }
 
 export const mqttService = new MqttService();