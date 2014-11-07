#include "Memory.h"
#include "miniSDI_12.h"


Memory::Memory (void){
  
}

void Memory::memorySetup (void){
    headerBlockSize = sizeof(MemoryBlock) + sizeof(ExperimentBlock);
    dataBlockSize = sizeof(DataBlock);
    maxBlocks = (MEMORY_SIZE - headerBlockSize) / dataBlockSize;
    EEPROM.readBlock(MEMORY_BLOCK_ADDRESS, memoryBlock);
}

void Memory::updateExperimentBlock (ExperimentBlock experimentBlock){
    uint8_t tempReg = SREG;
    SREG &= (0 << 7);
    EEPROM.updateBlock(EXPERIMENT_BLOCK_ADDRESS, experimentBlock);
    SREG = tempReg;
}

void Memory::loadExperimentBlock (ExperimentBlock* experimentBlock){
    ExperimentBlock newBlock;
    EEPROM.readBlock(EXPERIMENT_BLOCK_ADDRESS, newBlock);
    setEqual(experimentBlock, &newBlock);
}

void Memory::saveDataBlock (DataBlock dataBlock){
    uint8_t tempReg = SREG;
    SREG &= (0 << 7);
    EEPROM.updateBlock((memoryBlock.tailPtr)*dataBlockSize + headerBlockSize, dataBlock);
    memoryBlock.tailPtr = (((memoryBlock.tailPtr)+1) % maxBlocks);
    if (memoryBlock.tailPtr == memoryBlock.headPtr){
        memoryBlock.headPtr = ((memoryBlock.headPtr)+1) % maxBlocks;
    }
    EEPROM.updateBlock(MEMORY_BLOCK_ADDRESS,memoryBlock);
    SREG = tempReg;
}

boolean Memory::loadDataBlock (uint16_t* address, DataBlock* dataBlock){
      if (*address == memoryBlock.tailPtr){
          return true;
      }
      DataBlock newBlock;
      EEPROM.readBlock((*address)*dataBlockSize + headerBlockSize, newBlock);
      setEqual (dataBlock, &newBlock);
      *address = (*address+1) % maxBlocks;
      return false;

}

void Memory::reset (void){
    memoryBlock.headPtr = 0;
    memoryBlock.tailPtr = 0;
    uint8_t tempReg = SREG;
    SREG &= (0 << 7);
    EEPROM.updateBlock(MEMORY_BLOCK_ADDRESS, memoryBlock);
    SREG = tempReg;
}
//set block1 equal to block2
void Memory::setEqual (ExperimentBlock* block1, ExperimentBlock* block2){
    block1 -> isRunning = block2 -> isRunning;             
    block1 -> port = block2 -> port;                  
    block1 -> startTime = block2 -> startTime;            
    block1 -> periodLgth = block2 -> periodLgth;           
    block1 -> targetMeasurment = block2 -> targetMeasurment;     
}

void Memory::setEqual (DataBlock* block1, DataBlock* block2){
  block1 -> port = block2 -> port;
  block1 -> periodNumber = block2 -> periodNumber;
  block1 -> data = block2 -> data;
}
