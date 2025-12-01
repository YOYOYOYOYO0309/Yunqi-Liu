export enum MoistureStatus {
  DRY = 'DRY',
  WET = 'WET',
  UNKNOWN = 'UNKNOWN'
}

export interface Reading {
  id: string;
  timestamp: Date;
  temperature: number; // in Celsius
  moisture: MoistureStatus;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface GeminiAnalysisResult {
  status: MoistureStatus;
  confidence: number;
  description: string;
}

// Web Bluetooth Type Definitions
export interface BluetoothRemoteGATTCharacteristic {
  readValue(): Promise<DataView>;
}

export interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
}

export interface BluetoothRemoteGATTServer {
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
}

export interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
  };
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}
