import { IMonitoringData } from "./monitoringDataInterface";
import { WriteStream, createWriteStream } from 'fs'

let fileStream :WriteStream;

export function createFile(fileName :string) {
  fileStream = createWriteStream(fileName);
  fileStream.write('Timestamp,CpuUsage,MemoryUsage,ResponseTime\n');
}
export function writeBatch(data: IMonitoringData, startIndex: number, endIndex :number) {
  for(let i = startIndex; i <= endIndex; i++) {
    const line = `${data.os[i].timestamp},${data.os[i].cpu},${data.os[i].memory},${data.responses[i]?.mean}\n`;
    fileStream.write(line);
  }
}
export function writeAverages(cpu: number, memory: number, responseTime: number) {
  const line = `Average,${cpu},${memory},${responseTime}\n`;
  fileStream.write(line);
  fileStream.close();
}