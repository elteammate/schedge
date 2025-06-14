variable "zone" {
  type    = string
  default = "ru-central1-a"
}

variable "yc_cloud_id" {
  type = string
}

variable "yc_folder_id" {
  type = string
}

variable "yc_token" {
  type = string
}

variable "mongo_disk_size" {
  type    = number
  default = 10
}

variable "mongo_username" {
  type    = string
  default = "schedge"
}

variable "mongo_password" {
  type = string
}

variable "yc_subnet_cidr" {
  type = list(string)
  default = ["10.1.0.0/16"]
}

variable "yc_service_account_id" {
  type = string
}

variable "k8s_version" {
  type    = string
  default = "1.32"
}

variable "k8s_node_number" {
  type    = number
  default = 2
}
