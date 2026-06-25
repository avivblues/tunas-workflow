interface FormFeedbackProps {
  success?: string;
  error?: string;
}

export function FormFeedback({ success, error }: FormFeedbackProps) {
  if (!success && !error) return null;

  return (
    <>
      {success && (
        <div className="alert alert-success" role="status">
          {success}
        </div>
      )}
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
