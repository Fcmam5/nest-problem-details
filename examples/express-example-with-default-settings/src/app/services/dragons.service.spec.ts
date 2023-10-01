import { Test, TestingModule } from '@nestjs/testing';
import { DragonsService } from './dragons.service';

const mockDragons = [
  { id: 0, name: 'irgin', title: 'The Magnificent' },
  { id: 1, name: 'Dyrod', title: 'The Dragonlord' },
  { id: 2, name: 'Cylranth', title: 'The Dark One' },
];

describe('DragonsService', () => {
  let service: DragonsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DragonsService,
        {
          provide: 'dragons',
          useValue: mockDragons,
        },
      ],
    }).compile();

    service = module.get<DragonsService>(DragonsService);
  });

  it('should return all dragons', () => {
    expect(service.getAll()).toEqual(mockDragons);
  });

  describe('findByName', () => {
    it('should return dragon by name', () => {
      expect(service.getByIdOrNull(1)).toEqual({
        id: 1,
        name: 'Dyrod',
        title: 'The Dragonlord',
      });
    });

    it('should return return null if the dragon is not found', () => {
      expect(service.getByIdOrNull(99)).toBeNull();
    });
  });
});
