import { defaultConfig } from "../config.js";
import { crawl} from "./core.js";
import { mkdir } from "fs/promises";
import path from 'path';
await mkdir(path.join('storage/datasets', 'imgs'), { recursive: true });
await crawl(defaultConfig);