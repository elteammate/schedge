terraform {
  required_providers {
    yandex = {
      source = "yandex-cloud/yandex"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "2.14.0"
    }
  }
  required_version = ">= 0.13"
}

provider "yandex" {
  zone      = var.zone
  cloud_id  = var.yc_cloud_id
  folder_id = var.yc_folder_id
  token     = var.yc_token
}

resource "yandex_vpc_network" "schedge-network" {
  name = "schedge-network"
}

resource "yandex_vpc_subnet" "schedge-subnet" {
  name           = "schedge-subnet"
  network_id     = yandex_vpc_network.schedge-network.id
  zone           = var.zone
  v4_cidr_blocks = var.yc_subnet_cidr
}

resource "yandex_mdb_mongodb_cluster" "schedge-mongo" {
  name        = "schedge-mongo"
  environment = "PRODUCTION"
  network_id  = yandex_vpc_network.schedge-network.id

  host {
    subnet_id = yandex_vpc_subnet.schedge-subnet.id
    zone_id   = var.zone
  }

  cluster_config {
    version = "6.0"
  }

  security_group_ids = [yandex_vpc_security_group.all-traffic.id]

  resources_mongod {
    disk_size          = var.mongo_disk_size
    disk_type_id       = "network-ssd"
    resource_preset_id = "s2.small"
  }
}

resource "yandex_mdb_mongodb_database" "schedge-mongo-db" {
  cluster_id = yandex_mdb_mongodb_cluster.schedge-mongo.id
  name       = "schedge"
}

resource "yandex_mdb_mongodb_user" "schedge-mongo-user" {
  cluster_id = yandex_mdb_mongodb_cluster.schedge-mongo.id
  name       = var.mongo_username
  password   = var.mongo_password
  permission {
    database_name = yandex_mdb_mongodb_database.schedge-mongo-db.name
    roles = ["readWrite", "mdbDbAdmin"]
  }
}

resource "yandex_kubernetes_cluster" "schedge-k8s-cluster" {
  name       = "schedge-k8s-cluster"
  network_id = yandex_vpc_network.schedge-network.id

  service_account_id      = var.yc_service_account_id
  node_service_account_id = var.yc_service_account_id

  master {
    master_location {
      subnet_id = yandex_vpc_subnet.schedge-subnet.id
      zone      = yandex_vpc_subnet.schedge-subnet.zone
    }

    version   = var.k8s_version
    public_ip = true
    security_group_ids = [yandex_vpc_security_group.all-traffic.id]
  }
}

resource "yandex_kubernetes_node_group" "schedge-k8s-node-group" {
  name       = "schedge-k8s-node-group"
  cluster_id = yandex_kubernetes_cluster.schedge-k8s-cluster.id
  version    = var.k8s_version

  scale_policy {
    fixed_scale {
      size = var.k8s_node_number
    }
  }

  instance_template {
    platform_id = "standard-v2"

    resources {
      memory        = 2
      cores         = 2
      core_fraction = 20
    }

    boot_disk {
      type = "network-hdd"
      size = 64
    }

    network_interface {
      subnet_ids = [yandex_vpc_subnet.schedge-subnet.id]
      nat = true
      security_group_ids = [yandex_vpc_security_group.all-traffic.id]
    }
  }
}

resource "yandex_vpc_security_group" "all-traffic" {
  name = "all-traffic"

  ingress {
    protocol  = "ANY"
    from_port = 0
    to_port   = 65535
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol  = "ANY"
    from_port = 0
    to_port   = 65535
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  network_id = yandex_vpc_network.schedge-network.id
}

output "mongo_host" {
  value = yandex_mdb_mongodb_cluster.schedge-mongo.id
}

output "mongo_username" {
  value = yandex_mdb_mongodb_user.schedge-mongo-user.name
}

output "mongo_password" {
  value     = yandex_mdb_mongodb_user.schedge-mongo-user.password
  sensitive = true
}