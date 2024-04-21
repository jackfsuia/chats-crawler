import { Config } from "./src/config";

export const defaultConfig: Config = {
  url: "https://discuss.pytorch.org/",
  match: "null-useful-addresss-23898938923",
  rex: "https://discuss.pytorch.org/t/[^/]+/[0-9]+$",

  maxPagesToCrawl: 100,
   // maxRequestsPerMinute: 100,
  selector: `a`,
  outputFileName: "output.json",
};
