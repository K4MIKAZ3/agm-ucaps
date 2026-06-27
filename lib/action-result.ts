export type ActionResult = {
  error?: string;
  success?: string;
};

export function actionError(message: string): ActionResult {
  return { error: message };
}

export function actionSuccess(message: string): ActionResult {
  return { success: message };
}
