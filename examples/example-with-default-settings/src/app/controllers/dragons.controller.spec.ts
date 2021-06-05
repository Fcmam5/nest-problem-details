import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IDragon } from 'src/interfaces/dragon.interface';
import { DragonsService } from 'src/services/dragons.service';
import { DragonsController } from './dragons.controller';

const dragons = [
  { id: 0, name: 'irgin', title: 'The Magnificent' },
  { id: 1, name: 'Dyrod', title: 'The Dragonlord' },
  { id: 2, name: 'Cylranth', title: 'The Dark One' },
];

const mockDragonsService = {
  getAll: jest.fn().mockReturnValue(dragons),
  getByIdOrNull: jest.fn(),
};

describe('DragonsController', () => {
  let controller: DragonsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DragonsController],
      providers: [
        {
          provide: DragonsService,
          useValue: mockDragonsService,
        },
      ],
    }).compile();

    controller = module.get<DragonsController>(DragonsController);
  });

  describe('getAll', () => {
    it('should return all dragons', () => {
      expect(controller.getAll()).toEqual({ dragons });
    });
  });

  describe('getOneById', () => {
    it('should return the dragon if found', () => {
      const returnedDragon = dragons[1];

      mockDragonsService.getByIdOrNull.mockReturnValueOnce(returnedDragon);

      expect(controller.getOneById(1)).toEqual({ dragon: returnedDragon });
    });

    it('should throw if the dragon is not found', () => {
      mockDragonsService.getByIdOrNull.mockReturnValueOnce(null);

      expect(() => controller.getOneById(99)).toThrowError(NotFoundException);
    });
  });
});
