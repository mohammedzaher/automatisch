import Flow from '../models/flow';
import globalVariable from '../helpers/global-variable';
import EarlyExitError from '../errors/early-exit';
import HttpError from '../errors/http-error';

type ProcessFlowOptions = {
  flowId: string;
  testRun?: boolean;
};

export const processFlow = async (options: ProcessFlowOptions) => {
  const flow = await Flow.query().findById(options.flowId).throwIfNotFound();

  const triggerStep = await flow.getTriggerStep();
  const triggerCommand = await triggerStep.getTriggerCommand();

  const $ = await globalVariable({
    flow,
    connection: await triggerStep.$relatedQuery('connection'),
    app: await triggerStep.getApp(),
    step: triggerStep,
    testRun: options.testRun,
  });

  try {
    await triggerCommand.run($);
  } catch (error) {
    if (error instanceof EarlyExitError === false) {
      if (error instanceof HttpError) {
        $.triggerOutput.error = error.error;
      } else {
        try {
          $.triggerOutput.error = JSON.parse(error.message);
        } catch {
          $.triggerOutput.error = { error: error.message };
        }
      }
    }
  }

  return $.triggerOutput;
};
