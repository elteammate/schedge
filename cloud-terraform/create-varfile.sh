#!/usr/bin/env bash

yc_token=$(~/yandex-cloud/bin/yc iam create-token)
yc_cloud_id=$(~/yandex-cloud/bin/yc config get cloud-id)
yc_folder_id=$(~/yandex-cloud/bin/yc config get folder-id)

cat > .varfile <<EOF
yc_token = "${yc_token}"
yc_cloud_id = "${yc_cloud_id}"
yc_folder_id = "${yc_folder_id}"
EOF