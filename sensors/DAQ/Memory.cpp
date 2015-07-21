#include "Memory.h"
#include "miniSDI_12.h"

/**
Memory::Memory (void)
  Constructor for memory. Does nothing. A memorySetup function was made so that
  it could be called at a different time than declaration.
 @param void 
*/
Memory::Memory (void){
  
}

/**
void Memory::memorySetup (void)
  Sets up the parameters of the memroy unit.
  
  @param void
  
  @return void
*/
void Memory::memorySetup (void){
    headerBlockSize = sizeof(MemoryBlock) + sizeof(ExperimentBlock);
    dataBlockSize = sizeof(DataBlock);
    maxBlocks = (MEMORY_SIZE - headerBlockSize) / dataBlockSize;
    EEPROM.readBlock(MEMORY_BLOCK_ADDRESS, memoryBlock);
}//memorySetup

/**
void Memory::updateExperimentBlock (ExperimentBlock experimentBlock)
  Updates the experiment block in memroy by overwriting the existing experiment block.
  
  @param experimentBlock    The experiment block to write to EEPROM
  
  @return void
*/
void Memory::updateExperimentBlock (ExperimentBlock experimentBlock){
    uint8_t tempReg = SREG;    // save the status register
    SREG &= (0 << 7);          // turn off inturrupts to save memory
    EEPROM.updateBlock(EXPERIMENT_BLOCK_ADDRESS, experimentBlock);    //save memroy
    SREG = tempReg;            // return status register
}

/**
void Memory::loadExperimentBlock (ExperimentBlock* experimentBlock)
    Reads the experiment block from EEPROM and sets a pointer to the block.
    
    @param ExperimentBlock*  a pointer to point at the new experiment block
    
    @return void
*/
void Memory::loadExperimentBlock (ExperimentBlock* experimentBlock){
    ExperimentBlock newBlock;
    EEPROM.readBlock(EXPERIMENT_BLOCK_ADDRESS, newBlock);
    setEqual(experimentBlock, &newBlock);
}

/**
void Memory::saveDataBlock (DataBlock dataBlock)
    Saves a data block into memroy
    
    @param DataBlock  the block of data to be saved into memory
    
    @return void
*/
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

/**
void Memory::loadDataBlock (uint16_t effectiveAddress, DataBlock* dataBlock)
    Reads the data block at the effectiveAddress in EEPROM and sets DataBlock* to point at it.
    
    @param uint16_t effectiveAddress    The logical address the desired data block.
    @param DataBlock* dataBlock         A pointer to be set to the new data block.
*/
void Memory::loadDataBlock (uint16_t effectiveAddress, DataBlock* dataBlock){
    DataBlock newBlock;
    uint16_t absoluteAddress = effectiveAddress*dataBlockSize + headerBlockSize;
    EEPROM.readBlock(absoluteAddress, newBlock);
    setEqual (dataBlock, &newBlock);
}

/**
uint16_t Memory::getPtr(uint16_t numValues)
  returns the logical address of block in EEPROM of the block tailPtr - numValues

  @param uint16_t numValues    The number of desired data blocks
  
  @return uint16_t             Logical address of data block.
*/
uint16_t Memory::getPtr(uint16_t numValues){
    if(numValues < 1 || numValues > maxBlocks){
        return memoryBlock.headPtr;
    }
    //memory is full and any value in is acceptable
    else if (memoryBlock.headPtr > memoryBlock.tailPtr){
        if (numValues > memoryBlock.tailPtr){
            return (maxBlocks - (numValues - memoryBlock.tailPtr));
        }
        else{
            return (memoryBlock.tailPtr - numValues);
        }
    }
    //memory is not full and we can't ask for more than we have
    else{
        if(numValues > memoryBlock.tailPtr){
            return memoryBlock.headPtr;
        }
        else{
            return (memoryBlock.tailPtr - numValues);
        }
    }
}

/**
void Memory::updatePtr(uint16_t* ptr)
  Increments ptr by one and makes sure it doesn't
  
  @param pointer the the memory pointer
  
  @reutnr void
*/
void Memory::updatePtr(uint16_t* ptr){
    (*ptr) = ((*ptr)+1) % maxBlocks;
}

/**
void Memory::reset (void)
    Sets points in memBlock to head of circular FIFO array. effectily reseting memory
    
    @param void
    
    @return void
*/
void Memory::reset (void){
    memoryBlock.headPtr = 0;
    memoryBlock.tailPtr = 0;
    uint8_t tempReg = SREG;
    SREG &= (0 << 7);
    EEPROM.updateBlock(MEMORY_BLOCK_ADDRESS, memoryBlock);
    SREG = tempReg;
}

/**
void Memory::setEqual (ExperimentBlock* block1, ExperimentBlock* block2)
    set ExperimentBlock1 equal to ExperimentBlock2

    @param ExperimentBlock* block1        experiment block to be set
    @param ExperimentBlock* block2        experiment block used as reference
    
    @return void
*/

void Memory::setEqual (ExperimentBlock* block1, ExperimentBlock* block2){
    block1 -> isRunning = block2 -> isRunning;             
    block1 -> port = block2 -> port;                  
    block1 -> startTime = block2 -> startTime;            
    block1 -> periodLgth = block2 -> periodLgth;           
    block1 -> targetMeasurment = block2 -> targetMeasurment;     
}

/**
void Memory::setEqual (DataBlock* block1, DataBlock* block2)
    set DataBlock1 equal to DataBlock2
    
    @param DataBlock* block1    DataBlock to be set
    @param DataBlock* block2    DataBlock used as reference

    @return void
*/
void Memory::setEqual (DataBlock* block1, DataBlock* block2){
  block1 -> port = block2 -> port;
  block1 -> periodNumber = block2 -> periodNumber;
  block1 -> data = block2 -> data;
}
