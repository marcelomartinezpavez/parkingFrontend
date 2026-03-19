import React from "react";

export default function PrinterButton() {
  const handlePrint = async () => {
    try {
      // Solicitar conexión Bluetooth
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [0x1101] // UUID de servicio SPP (ejemplo)
      });

      const server = await device.gatt.connect();

      // Servicio/característica típica de impresoras térmicas Bluetooth
      const service = await server.getPrimaryService(0x1101);
      const characteristic = await service.getCharacteristic("A6EFF897-2E2A-5987-76E3-4E6AFDA0A28D");

      // Texto a imprimir
      const encoder = new TextEncoder();
      const data = encoder.encode("Ticket Parking\nPatente: ABC123\n\n\n");

      await characteristic.writeValue(data);

      alert("Ticket enviado a la impresora!");
    } catch (error) {
      console.error("Error al imprimir:", error);
      alert("No se pudo imprimir. Revisa conexión Bluetooth.");
    }
  };

  return (
    <button className='button' onClick={handlePrint}>
      Imprimir Ticket
    </button>
  );
}