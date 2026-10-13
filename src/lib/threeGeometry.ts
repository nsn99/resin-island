import { BufferGeometry, BufferAttribute } from 'three';
import type { GeometryData } from '../core/geometry';
export function threeGeometry(data:GeometryData){const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(data.positions,3));geometry.setAttribute('normal',new BufferAttribute(data.normals,3));geometry.setAttribute('color',new BufferAttribute(data.colors,3));if(data.uvs)geometry.setAttribute('uv',new BufferAttribute(data.uvs,2));geometry.setIndex(new BufferAttribute(data.indices,1));geometry.computeBoundingSphere();return geometry;}
