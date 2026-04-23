variable "environment" {
  type = string
}

variable "nextauth_secret" {
  type      = string
  sensitive = true
}

variable "nextauth_url" {
  type = string
}

variable "google_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "google_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "twilio_account_sid" {
  type      = string
  sensitive = true
  default   = ""
}

variable "twilio_auth_token" {
  type      = string
  sensitive = true
  default   = ""
}

variable "twilio_phone_number" {
  type    = string
  default = ""
}

variable "vapid_public_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "vapid_private_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "assets_bucket_name" {
  type = string
}

variable "aws_region" {
  type = string
}
