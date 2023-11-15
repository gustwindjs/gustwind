export type ScriptWorkerEvent = {
  type: "writeScript";
  payload: {
    outputDirectory: string;
    file: string;
    scriptPath: string;
    externals?: string[];
  };
};
