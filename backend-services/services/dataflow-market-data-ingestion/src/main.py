import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
import random
import time

def create_market_data():
    # Mock market data
    data = {
        'symbol': random.choice(['ETH', 'BTC', 'USDC']),
        'price': random.uniform(100, 5000),
        'volume': random.uniform(1000, 100000),
        'timestamp': int(time.time() * 1000)
    }
    return data

def process_data(data):
    # Simple processing: log the data
    print(f"Processed market data: {data}")
    return data

def run():
    options = PipelineOptions()
    with beam.Pipeline(options=options) as p:
        (p
         | 'CreateData' >> beam.Create([create_market_data() for _ in range(10)])
         | 'ProcessData' >> beam.Map(process_data)
         | 'LogData' >> beam.Map(print)
        )

if __name__ == '__main__':
    run()
