export interface ApiSuccess<T> {
  data: T;
}

export interface ApiFailure {
  error: {
    code: string;
    message: string;
    field?: string;
    requestId: string;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface SelectOption {
  value: string;
  label: string;
}
