import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { runQueue } from './queue';

const name = 'snaproom-upload-queue';
TaskManager.defineTask(name, async () => {
  try { await runQueue(); return BackgroundTask.BackgroundTaskResult.Success; }
  catch { return BackgroundTask.BackgroundTaskResult.Failed; }
});
export async function registerUploads() {
  if (!(await TaskManager.isAvailableAsync()) || await BackgroundTask.getStatusAsync() !== BackgroundTask.BackgroundTaskStatus.Available) return false;
  await BackgroundTask.registerTaskAsync(name, { minimumInterval: 15 });
  return true;
}
