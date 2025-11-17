import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { IMonitoringData, IMonitoringOSData, IMonitoringResponseData } from './monitoringDataInterface';
const onHeaders = require('on-headers');
import gatherOsMetrics from './gather-os-metrics';
import onHeadersListener from './on-headers-listener'
import { createFile, writeAverages, writeBatch } from './write-data';

const middlewareWrapper = (collectionInterval :number, writeBatchSize :number) => {
  let active = false;
  let collectionIntervalId :ReturnType<typeof setInterval>;
  let fileName = '';
  const data = {
    os: [],
    responses: [],
    interval: collectionInterval
  } as IMonitoringData
  let writes = 0;

  const middleware = (req :Request, res :Response, next :NextFunction) => {
    const startTime = process.hrtime();

    if (req.path === '/api/startMonitoring') {
      fileName = req.query.fileName as string || '';
      if(fileName === '') {
        res.status(400).send('Filename required');
      }
      else if(!active) {
        if(!fs.existsSync('./dist/monitoringData')) {
          fs.mkdirSync('./dist/monitoringData');
        }
        createFile(`./dist/monitoringData/${fileName}.csv`);

        gatherOsMetrics(data);
        collectionIntervalId = setInterval(() => {
          gatherOsMetrics(data);
          if(data.os.length && (data.os.length % writeBatchSize) == 0) {
            const startIndex = writes * writeBatchSize;
            const endIndex = startIndex + (writeBatchSize - 1);
            writeBatch(data, startIndex, endIndex);
            writes++;
          }
        }, data.interval * 1000);
        collectionIntervalId.unref();
  
        active = true;
        res.send('Monitoring Started');
      }
      else {
        res.status(400).send('Monitoring already active');        
      }
    }
    else if (req.path === '/api/stopMonitoring') {
      if(active) {
        clearInterval(collectionIntervalId);

        writeBatch(data, writes*writeBatchSize, data.os.length-1);

        let cpuSum = 0;
        let memSum = 0;
        data.os.forEach((os) => {
          cpuSum += os.cpu;
          memSum += os.memory;
        });
        const cpuAverage = cpuSum / data.os.length;
        const memoryAverage = memSum / data.os.length;

        let responseTimeSum = 0;
        let responseCountSum = 0;
        data.responses.forEach((response) => {
          responseTimeSum += response.mean * response.count;
          responseCountSum += response.count;
        });
        const responseTimeAverage = responseTimeSum / responseCountSum;

        writeAverages(cpuAverage, memoryAverage, responseTimeAverage);

        fileName = '';
        active = false;
        res.send('Monitoring Stopped');
      }
      else {
        res.status(400).send('Monitoring not active');
      }
    }
    else {
      if(active) {
        onHeaders(res, () => {
          onHeadersListener(res.statusCode, startTime, data);
        });        
      }

      next();
    }
  };

  middleware.middleware = middleware;
  return middleware;
};

module.exports = middlewareWrapper;