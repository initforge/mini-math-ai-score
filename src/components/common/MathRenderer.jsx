import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

/**
 * Component render text với ký hiệu toán học LaTeX
 * Hỗ trợ: $...$ (inline math) và $$...$$ (block math)
 * ROBUST: Tự động wrap LaTeX commands nếu không có $...$
 */
export default function MathRenderer({ content }) {
  if (!content) return null;

  // STEP 0: Pre-process - Fix common AI issues
  let processedContent = content;
  
  // Fix 1: Nếu có $ mở nhưng không đóng, tìm và đóng đúng vị trí
  // Ví dụ: "a) $A \cup B = {-3, -1}" → "a) $A \cup B = {-3, -1}$"
  const fixUnclosedDollar = (str) => {
    let result = '';
    let inMath = false;
    let mathStart = -1;
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (char === '$') {
        if (!inMath) {
          // Mở math mode
          inMath = true;
          mathStart = i;
        } else {
          // Đóng math mode
          inMath = false;
        }
      }
      result += char;
    }
    
    // Nếu vẫn còn trong math mode (chưa đóng $), thêm $ ở cuối
    if (inMath) {
      result += '$';
    }
    
    return result;
  };
  
  processedContent = fixUnclosedDollar(processedContent);
  
  // Fix 2: Nếu có LaTeX commands phổ biến NGOÀI $...$, wrap từng command
  // Ví dụ: "a) $A \cup B" (đã fix $ đóng ở trên) → không cần làm gì thêm
  // Ví dụ: "A \cup B = {1,2}" (không có $ nào) → "$A \cup B = {1,2}$"
  const hasLatexCommand = (str) => {
    return /\\(cup|cap|setminus|frac|sqrt|sin|cos|tan|alpha|beta|gamma|ge|le|in|notin|subset|supset|times|div|pm|mp|cdot|ldots|cdots|infty|sum|prod|int|lim|log|ln|exp|begin|end|left|right)/.test(str);
  };
  
  // Nếu có LaTeX command nhưng KHÔNG có $ nào → wrap toàn bộ
  if (hasLatexCommand(processedContent) && !processedContent.includes('$')) {
    processedContent = '$' + processedContent + '$';
  }

  // Parse content và tách text vs math
  const parts = [];
  let lastIndex = 0;

  // Regex để tìm math delimiters:
  // 1. \[...\] (Block LaTeX)
  // 2. $$...$$ (Block KaTeX)
  // 3. \(...\) (Inline LaTeX)
  // 4. $...$ (Inline KaTeX) - non-greedy để match từng cặp
  const mathRegex = /\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)|\$([^$]+)\$/g;

  let match;
  while ((match = mathRegex.exec(processedContent)) !== null) {
    // Thêm text trước math
    if (match.index > lastIndex) {
      const textBefore = processedContent.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }

    // Xác định loại math và content
    if (match[1] !== undefined) {
      // \[...\] -> Block
      parts.push({ type: 'block-math', content: match[1].trim() });
    } else if (match[2] !== undefined) {
      // $$...$$ -> Block
      parts.push({ type: 'block-math', content: match[2].trim() });
    } else if (match[3] !== undefined) {
      // \(...\) -> Inline
      parts.push({ type: 'inline-math', content: match[3].trim() });
    } else if (match[4] !== undefined) {
      // $...$ -> Inline
      parts.push({ type: 'inline-math', content: match[4].trim() });
    }

    lastIndex = match.index + match[0].length;
  }

  // Thêm text còn lại
  if (lastIndex < processedContent.length) {
    const textAfter = processedContent.substring(lastIndex);
    if (textAfter) {
      parts.push({ type: 'text', content: textAfter });
    }
  }

  // SECOND PASS: Xử lý các phần text có chứa implicit math (ví dụ \{1, 2, 3\})
  // Hoặc clean các ký tự escape
  const refinedParts = [];
  parts.forEach(part => {
    if (part.type === 'text') {
      // Tìm pattern \{...\}
      const implicitRegex = /\\{([\s\S]+?)\\}/g;
      let localLastIndex = 0;
      let localMatch;

      while ((localMatch = implicitRegex.exec(part.content)) !== null) {
        // Text trước match
        if (localMatch.index > localLastIndex) {
          const text = part.content.substring(localLastIndex, localMatch.index);
          // Clean text: replace \{ -> { và \} -> } (cho trường hợp lẻ tẻ)
          refinedParts.push({
            type: 'text',
            content: text.replace(/\\{/g, '{').replace(/\\}/g, '}')
          });
        }

        // Math content: \{...\} -> render là math để hiện dấu ngoặc nhọn đẹp
        // Lưu ý: KaTeX cần \{ để hiện {, nên ta giữ nguyên cả cụm match[0] hoặc bọc lại
        refinedParts.push({ type: 'inline-math', content: localMatch[0] });

        localLastIndex = localMatch.index + localMatch[0].length;
      }

      // Text còn lại
      if (localLastIndex < part.content.length) {
        const text = part.content.substring(localLastIndex);
        refinedParts.push({
          type: 'text',
          content: text.replace(/\\{/g, '{').replace(/\\}/g, '}')
        });
      }
    } else {
      refinedParts.push(part);
    }
  });

  // Nếu không có math, return text thuần (đã clean)
  if (refinedParts.every(p => p.type === 'text')) {
    return <span>{content.replace(/\\{/g, '{').replace(/\\}/g, '}')}</span>;
  }

  // Render từng phần
  return (
    <span className="math-content">
      {refinedParts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        } else if (part.type === 'inline-math') {
          try {
            return <InlineMath key={index} math={part.content} />;
          } catch (error) {
            console.error('KaTeX render error (inline):', error);
            return <span key={index} className="math-error">${part.content}$</span>;
          }
        } else if (part.type === 'block-math') {
          try {
            return <BlockMath key={index} math={part.content} />;
          } catch (error) {
            console.error('KaTeX render error (block):', error);
            return <div key={index} className="math-error">$${part.content}$$</div>;
          }
        }
        return null;
      })}
    </span>
  );
}
