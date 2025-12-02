import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Thermometer, Droplets, Bluetooth, BluetoothConnected, BellRing, Activity } from 'lucide-react';
import SensorCard from './components/SensorCard';
import HistoryChart from './components/HistoryChart';
import { MoistureStatus, Reading, ConnectionStatus, BluetoothDevice, BluetoothRemoteGATTCharacteristic } from './types';

// UUIDs for the Arduino Service (Standard HM-10)
// We define both long and short forms to ensure browser compatibility
const SERVICE_UUID_LONG = '0000ffe0-0000-1000-8000-00805f9b34fb'; 
const SERVICE_UUID_SHORT = 0xFFE0; 

const CHARACTERISTIC_UUID_LONG = '0000ffe1-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID_SHORT = 0xFFE1;

const App: React.FC = () => {
  // Application State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Polling & Timer State
  const [nextUpdateIn, setNextUpdateIn] = useState<number>(0);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  
  // Bluetooth Refs
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  // Request Notification Permission on Mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Helper: Trigger Device Notification
  const triggerNotification = useCallback((message: string) => {
    setNotification(message);
    
    // Browser System Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification("SilicaSense Alert", {
        body: message,
        icon: '/icon.png'
      });
    }

    // Haptic Feedback
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 500]);
    }
  }, []);

  // Core Logic: Process a Data String (from BT or Sim)
  const processData = useCallback((dataString: string) => {
    // Expected format: "37.5,DRY" or "37.5,WET" or "37.5,MIXED"
    const parts = dataString.split(',');
    let temp = 0;
    let moisture = MoistureStatus.UNKNOWN;

    if (parts.length >= 2) {
      temp = parseFloat(parts[0]);
      const moistureStr = parts[1].trim().toUpperCase();
      
      if (moistureStr === 'WET') moisture = MoistureStatus.WET;
      else if (moistureStr === 'MIXED') moisture = MoistureStatus.MIXED;
      else moisture = MoistureStatus.DRY;
      
    } else {
      // Fallback parsing if format differs
      temp = parseFloat(dataString) || 0;
      if (dataString.includes('WET')) moisture = MoistureStatus.WET;
      else if (dataString.includes('MIXED')) moisture = MoistureStatus.MIXED;
      else moisture = MoistureStatus.DRY;
    }

    const newReading: Reading = {
      id: Date.now().toString(),
      timestamp: new Date(),
      temperature: temp,
      moisture: moisture
    };

    setLatestReading(newReading);
    setReadings(prev => [...prev, newReading].slice(-20)); // Keep last 20

    // Logic: Poll rates and Notifications based on status
    if (moisture === MoistureStatus.WET) {
      triggerNotification("Excessive moisture detected! Silica gel is saturated.");
      // If wet, poll faster to see active changes
      setNextUpdateIn(30); 
    } else if (moisture === MoistureStatus.MIXED) {
      // Mixed: No alarm yet, but poll faster than dry to catch the transition to wet
      setNotification(null);
      setNextUpdateIn(120); // 2 minutes
    } else {
      // Dry: Standard poll rate
      setNotification(null);
      setNextUpdateIn(300); // 5 minutes
    }
  }, [triggerNotification]);

  // Bluetooth: Connect
  const connectBluetooth = async () => {
    try {
      setConnectionStatus('connecting');
      setIsSimulationMode(false);

      console.log("Requesting Bluetooth Device...");

      // @ts-ignore - navigator.bluetooth is experimental
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        // IMPORTANT: We must list all services we plan to access here
        optionalServices: [SERVICE_UUID_LONG, SERVICE_UUID_SHORT]
      });

      console.log("Device selected:", device.name);
      deviceRef.current = device;
      device.addEventListener('gattserverdisconnected', onDisconnected);

      console.log("Connecting to GATT Server...");
      const server = await device.gatt.connect();
      
      console.log("Getting Primary Service...");
      let service;
      try {
        // Try long UUID first
        service = await server.getPrimaryService(SERVICE_UUID_LONG);
      } catch (e) {
        console.warn("Long UUID not found, trying short UUID...", e);
        try {
          service = await server.getPrimaryService(SERVICE_UUID_SHORT);
        } catch (e2) {
           console.error("Service not found. Listing available services is not possible in browser due to security, but ensure your Arduino is broadcasting service: 0000ffe0 or FFE0");
           throw new Error("Service Not Found. Please ensure you selected the correct 'HMSoft' or 'BT05' device, and not your computer/headphones.");
        }
      }

      console.log("Getting Characteristic...");
      let characteristic;
      try {
        characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID_LONG);
      } catch (e) {
         try {
           characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID_SHORT);
         } catch (e2) {
           throw new Error("Characteristic Not Found. The device has the service but not the data characteristic (FFE1).");
         }
      }
      
      characteristicRef.current = characteristic;
      setConnectionStatus('connected');
      console.log("Connected successfully!");
      
      // Perform immediate read upon connection
      await fetchReading();

    } catch (error: any) {
      console.error("Bluetooth Connection Error:", error);
      setConnectionStatus('disconnected');
      
      let msg = "Failed to connect.";
      if (error.name === 'NotFoundError') {
        msg = "User cancelled the selection.";
      } else if (error.message) {
        msg = error.message;
      }
      
      alert(msg);
    }
  };

  const onDisconnected = () => {
    console.log("Device disconnected");
    setConnectionStatus('disconnected');
    deviceRef.current = null;
    characteristicRef.current = null;
    setNotification("Device Disconnected");
  };

  // Bluetooth: Fetch Data
  const fetchReading = useCallback(async () => {
    if (isSimulationMode) {
      // Simulation Logic
      const simTemp = (36 + Math.random() * 1.5).toFixed(1);
      const rand = Math.random();
      let simMoisture = "DRY";
      if (rand > 0.8) simMoisture = "WET";
      else if (rand > 0.6) simMoisture = "MIXED";

      processData(`${simTemp},${simMoisture}`);
      return;
    }

    if (!characteristicRef.current) return;

    try {
      const value = await characteristicRef.current.readValue();
      const decoder = new TextDecoder('utf-8');
      const dataString = decoder.decode(value);
      console.log("Data Received:", dataString);
      processData(dataString);
    } catch (err) {
      console.error("Read Error:", err);
      // Optional: attempt reconnect or ignore
    }
  }, [isSimulationMode, processData]);

  // Timer Loop for Polling
  useEffect(() => {
    if (connectionStatus !== 'connected' && !isSimulationMode) return;

    const timer = setInterval(() => {
      setNextUpdateIn(prev => {
        if (prev <= 1) {
          fetchReading();
          // Reset will happen inside processData based on result
          return 5; // Temporary buffer
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [connectionStatus, isSimulationMode, fetchReading]);

  // Initial Setup for Demo
  useEffect(() => {
    // Start in sim mode for demonstration if needed, or wait for user
    // We'll wait for user action to keep it clean.
  }, []);

  const toggleSimulation = () => {
    if (isSimulationMode) {
      setIsSimulationMode(false);
      setConnectionStatus('disconnected');
      setReadings([]);
      setLatestReading(null);
    } else {
      setIsSimulationMode(true);
      setConnectionStatus('connected'); // Fake connection
      setNextUpdateIn(1); // Trigger immediate read
    }
  };

  // Format countdown time
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Updating...';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getMoistureColor = (status?: MoistureStatus) => {
    switch (status) {
      case MoistureStatus.WET: return 'red';
      case MoistureStatus.MIXED: return 'orange';
      case MoistureStatus.DRY: return 'green';
      default: return 'gray';
    }
  };

  const getMoistureText = (status?: MoistureStatus) => {
     switch (status) {
      case MoistureStatus.WET: return 'Moisture Detected';
      case MoistureStatus.MIXED: return 'Mixed Levels';
      case MoistureStatus.DRY: return 'Silica Gel Dry';
      default: return 'Waiting for Data';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* Header */}
      <header className="bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">SilicaSense</h1>
            <p className="text-xs font-medium text-slate-500">Bluetooth Monitor</p>
          </div>
          <div className={`rounded-full p-2 transition-colors ${connectionStatus === 'connected' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
            <Activity size={20} />
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-md px-6">
        
        {/* Connection Panel */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${connectionStatus === 'connected' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                {connectionStatus === 'connected' ? <BluetoothConnected size={20} /> : <Bluetooth size={20} />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-700">Device Status</h2>
                <p className="text-xs text-slate-500 capitalize">{isSimulationMode ? 'Simulation Mode' : connectionStatus}</p>
              </div>
            </div>
            {connectionStatus === 'connected' && (
               <div className="text-right">
                 <p className="text-[10px] uppercase font-bold text-slate-400">Next Update</p>
                 <p className="font-mono text-sm font-semibold text-slate-700">{formatTime(nextUpdateIn)}</p>
               </div>
            )}
          </div>

          {connectionStatus !== 'connected' && (
            <button 
              onClick={connectBluetooth}
              disabled={connectionStatus === 'connecting'}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect to Device'}
            </button>
          )}

           {/* Hidden Simulation Toggle for Dev/Demo */}
           <button onClick={toggleSimulation} className="mt-2 w-full text-xs text-slate-300 hover:text-slate-500">
             {isSimulationMode ? "Disable Simulation" : "Enable Demo Mode"}
           </button>
        </div>

        {/* Notifications */}
        {notification && (
          <div className="mb-6 animate-bounce rounded-xl bg-red-500 p-4 text-white shadow-lg shadow-red-200">
            <div className="flex items-start gap-3">
              <BellRing className="mt-1 shrink-0 animate-pulse" />
              <div>
                <h3 className="font-bold">Alert Sent to Phone</h3>
                <p className="text-sm opacity-90">{notification}</p>
              </div>
            </div>
          </div>
        )}

        {/* Readings Grid */}
        <div className="grid gap-4 opacity-100 transition-opacity duration-500" style={{ opacity: connectionStatus === 'connected' ? 1 : 0.5 }}>
          <SensorCard 
            title="Temperature"
            value={latestReading ? latestReading.temperature.toFixed(1) : '--'}
            unit="°C"
            icon={Thermometer}
            statusColor={latestReading?.temperature && latestReading.temperature > 38 ? 'red' : 'blue'}
            subtext="Internal Sensor"
          />

          <SensorCard 
            title="Moisture"
            value={latestReading?.moisture || '--'}
            icon={Droplets}
            statusColor={getMoistureColor(latestReading?.moisture)}
            subtext={getMoistureText(latestReading?.moisture)}
          />
        </div>

        {/* History */}
        <div className="mt-8">
          <HistoryChart data={readings} />
        </div>

      </main>
    </div>
  );
};

export default App;