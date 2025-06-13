FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY schedge-backend/ ./

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

EXPOSE 5000

CMD ["python", "main.py"]
# CMD ["bash"]
