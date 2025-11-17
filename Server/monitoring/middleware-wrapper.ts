import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { IMonitoringData, IMonitoringOSData, IMonitoringResponseData } from './monitoringDataInterface';
const onHeaders = require('on-headers');
import gatherOsMetrics from './gather-os-metrics';
import onHeadersListener from './on-headers-listener'
import { createFile, writeAverages, writeBatch } from './write-data';

