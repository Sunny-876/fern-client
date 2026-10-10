import { FernAPI } from '../preload';

declare global {
  interface Window {
    fern?: FernAPI;
  }
}
declare module '*.css';
