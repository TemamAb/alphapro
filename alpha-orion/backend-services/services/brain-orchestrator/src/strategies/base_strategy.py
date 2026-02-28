from abc import ABC, abstractmethod

class BaseStrategy(ABC):
    def __init__(self, name, description, risk_level):
        self.name = name
        self.description = description
        self.risk_level = risk_level
        self.active = True

    @abstractmethod
    def execute(self, opportunity):
        pass

    def to_dict(self):
        return {
            'name': self.name,
            'description': self.description,
            'risk_level': self.risk_level,
            'active': self.active
        }
