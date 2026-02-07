// lib/error-handler.ts
// Centralized error handling utility for API routes

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: string;           // Technical error type
  message: string;         // User-friendly message
  details?: any;           // Optional additional info (dev mode only)
  statusCode: number;      // HTTP status code
}

/**
 * Error types with user-friendly messages
 */
export const ErrorMessages = {
  // Authentication errors
  UNAUTHORIZED: 'You must be logged in to access this resource.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  INVALID_TOKEN: 'Your session has expired. Please log in again.',

  // Validation errors
  INVALID_INPUT: 'The provided data is invalid. Please check your input.',
  MISSING_FIELDS: 'Required fields are missing. Please fill in all required information.',
  INVALID_FORMAT: 'The data format is incorrect. Please check and try again.',

  // Resource errors
  NOT_FOUND: 'The requested resource was not found.',
  ALREADY_EXISTS: 'This resource already exists.',
  CONFLICT: 'This action conflicts with existing data.',

  // Database errors
  DATABASE_ERROR: 'A database error occurred. Please try again later.',
  CONNECTION_ERROR: 'Unable to connect to the database. Please try again.',

  // Business logic errors
  INSUFFICIENT_BALANCE: 'Insufficient balance to complete this transaction.',
  TRADE_ALREADY_SETTLED: 'This trade has already been settled.',
  INVALID_TRADE_AMOUNT: 'Trade amount must be within the allowed range.',
  ASSET_DISABLED: 'This asset is currently disabled for trading.',

  // File upload errors
  FILE_TOO_LARGE: 'The file size exceeds the maximum allowed limit.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a supported file format.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',

  // Generic errors
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
  RATE_LIMIT: 'Too many requests. Please slow down and try again.',
} as const;

/**
 * HTTP Status Codes
 */
export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Main error handler that converts errors to standardized API responses
 */
export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  // Development mode: include full error details
  const isDev = process.env.NODE_ENV === 'development';

  // Default error response
  let response: ApiErrorResponse = {
    error: 'INTERNAL_ERROR',
    message: ErrorMessages.INTERNAL_ERROR,
    statusCode: StatusCodes.INTERNAL_ERROR,
  };

  // Handle Prisma errors
  if (error instanceof (Prisma as any).PrismaClientKnownRequestError) {
    response = handlePrismaError(error as any);
  }
  // Handle Prisma validation errors
  else if (error instanceof (Prisma as any).PrismaClientValidationError) {
    response = {
      error: 'INVALID_INPUT',
      message: ErrorMessages.INVALID_INPUT,
      statusCode: StatusCodes.BAD_REQUEST,
    };
  }
  // Handle standard Error objects
  else if (error instanceof Error) {
    // Check if it's a known error type
    const errorType = getErrorType(error.message);
    if (errorType) {
      response = {
        error: errorType,
        message: ErrorMessages[errorType as keyof typeof ErrorMessages] || error.message,
        statusCode: getStatusCodeForError(errorType),
      };
    } else {
      // Unknown error
      response = {
        error: 'INTERNAL_ERROR',
        message: isDev ? error.message : ErrorMessages.INTERNAL_ERROR,
        statusCode: StatusCodes.INTERNAL_ERROR,
      };
    }
  }

  // Add context and details in development mode
  if (isDev) {
    response.details = {
      context,
      originalError: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error),
    };
  }

  // Log the error for monitoring
  console.error(`[API Error]${context ? ` [${context}]` : ''}:`, error);

  return NextResponse.json(response, { status: response.statusCode });
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: any): ApiErrorResponse {
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      return {
        error: 'ALREADY_EXISTS',
        message: ErrorMessages.ALREADY_EXISTS,
        statusCode: StatusCodes.CONFLICT,
      };
    case 'P2025': // Record not found
      return {
        error: 'NOT_FOUND',
        message: ErrorMessages.NOT_FOUND,
        statusCode: StatusCodes.NOT_FOUND,
      };
    case 'P2003': // Foreign key constraint violation
      return {
        error: 'CONFLICT',
        message: ErrorMessages.CONFLICT,
        statusCode: StatusCodes.CONFLICT,
      };
    case 'P2024': // Connection timeout
      return {
        error: 'CONNECTION_ERROR',
        message: ErrorMessages.CONNECTION_ERROR,
        statusCode: StatusCodes.SERVICE_UNAVAILABLE,
      };
    default:
      return {
        error: 'DATABASE_ERROR',
        message: ErrorMessages.DATABASE_ERROR,
        statusCode: StatusCodes.INTERNAL_ERROR,
      };
  }
}

/**
 * Extract error type from error message
 */
function getErrorType(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('not authenticated')) {
    return 'UNAUTHORIZED';
  }
  if (lowerMessage.includes('forbidden') || lowerMessage.includes('permission denied')) {
    return 'FORBIDDEN';
  }
  if (lowerMessage.includes('not found')) {
    return 'NOT_FOUND';
  }
  if (lowerMessage.includes('already exists') || lowerMessage.includes('duplicate')) {
    return 'ALREADY_EXISTS';
  }
  if (lowerMessage.includes('insufficient balance')) {
    return 'INSUFFICIENT_BALANCE';
  }
  if (lowerMessage.includes('invalid') || lowerMessage.includes('validation')) {
    return 'INVALID_INPUT';
  }

  return null;
}

/**
 * Get appropriate HTTP status code for error type
 */
function getStatusCodeForError(errorType: string): number {
  const errorToStatusMap: Record<string, number> = {
    UNAUTHORIZED: StatusCodes.UNAUTHORIZED,
    FORBIDDEN: StatusCodes.FORBIDDEN,
    NOT_FOUND: StatusCodes.NOT_FOUND,
    ALREADY_EXISTS: StatusCodes.CONFLICT,
    INVALID_INPUT: StatusCodes.BAD_REQUEST,
    MISSING_FIELDS: StatusCodes.BAD_REQUEST,
    INVALID_FORMAT: StatusCodes.BAD_REQUEST,
    DATABASE_ERROR: StatusCodes.INTERNAL_ERROR,
    CONNECTION_ERROR: StatusCodes.SERVICE_UNAVAILABLE,
    RATE_LIMIT: StatusCodes.TOO_MANY_REQUESTS,
  };

  return errorToStatusMap[errorType] || StatusCodes.INTERNAL_ERROR;
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, statusCode: number = StatusCodes.OK): NextResponse<T> {
  return NextResponse.json(data, { status: statusCode });
}

/**
 * Create a standardized error response manually
 */
export function errorResponse(
  errorType: keyof typeof ErrorMessages,
  customMessage?: string,
  statusCode?: number
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({
    error: errorType,
    message: customMessage || ErrorMessages[errorType],
    statusCode: statusCode || getStatusCodeForError(errorType),
  }, {
    status: statusCode || getStatusCodeForError(errorType),
  });
}
