import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
import random
import time

def create_event():
    # Mock event data
    event = {
        'type': random.choice(['trade', 'order', 'price_update']),
        'symbol': random.choice(['ETH', 'BTC', 'USDC']),
        'volume': random.uniform(100, 100000),
        'timestamp': int(time.time() * 1000)
    }
    return event

def filter_high_volume(event):
    return event['volume'] > 50000

def process_event(event):
    print(f"High volume event: {event}")
    return event

def run():
    options = PipelineOptions()
    with beam.Pipeline(options=options) as p:
        (p
         | 'CreateEvents' >> beam.Create([create_event() for _ in range(20)])
         | 'FilterHighVolume' >> beam.Filter(filter_high_volume)
         | 'ProcessEvent' >> beam.Map(process_event)
        )

if __name__ == '__main__':
    run()
